'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { Category } from '@/types';
import { Plus, Edit, Trash2, Settings, Folder, FolderOpen, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seeding, setSeeding] = useState(false);
  const { success, error } = useToast();
  const errorRef = useRef(error);
  const loadingRef = useRef(false);

  // Keep error ref up to date
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const loadCategories = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      const data = await apiClient.getCategoryTree();
      
      // Ensure categories have is_active field (default to true if missing)
      const categoriesWithActive = Array.isArray(data) ? data.map(cat => ({
        ...cat,
        is_active: cat.is_active !== undefined ? cat.is_active : true
      })) : [];
      
      setCategories(categoriesWithActive);
    } catch (err) {
      console.error('Failed to load categories:', err);
      errorRef.current(
        'Failed to Load Categories',
        'Unable to fetch category data. Please try again.'
      );
      setCategories([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // No dependencies to prevent re-creation

  useEffect(() => {
    loadCategories();
  }, [loadCategories]); // Include loadCategories dependency

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setCreateLoading(true);
      const newCategory = await apiClient.createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined
      });
      
      // Show success message
      success(
        'Category Created Successfully!',
        `${newCategory.name} has been added to the system.`
      );
      
      // Reset form and close modal
      setFormData({ name: '', description: '', parent_id: '' });
      setShowAddModal(false);
      
      // Reload categories
      await loadCategories();
    } catch (err) {
      console.error('Failed to create category:', err);
      error(
        'Failed to Create Category',
        'Please check the form data and try again.'
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormData({ name: '', description: '', parent_id: '' });
    setErrors({});
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', parent_id: '' });
    setErrors({});
  };

  const openDeleteModal = (category: Category) => {
    setDeletingCategory(category);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingCategory(null);
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setErrors({});

    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setEditLoading(true);
      await apiClient.updateCategory(editingCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined
      });
      
      success(
        'Category Updated Successfully!',
        `${formData.name} has been updated.`
      );
      
      closeEditModal();
      await loadCategories();
    } catch (err) {
      console.error('Failed to update category:', err);
      error(
        'Failed to Update Category',
        'Please check the form data and try again.'
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      setDeleteLoading(true);
      await apiClient.deleteCategory(deletingCategory.id);
      
      success(
        'Category Deleted Successfully!',
        `${deletingCategory.name} has been removed from the system.`
      );
      
      closeDeleteModal();
      await loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      error(
        'Failed to Delete Category',
        'Please try again or check if the category has subcategories.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const seedDefaultCategories = async () => {
    try {
      setSeeding(true);
      
      // Define categories based on suit rental business context
      const defaultCategories = [
        {
          name: "Formal Wear",
          description: "Complete formal attire for special occasions",
          parent_id: undefined
        },
        {
          name: "Business Attire", 
          description: "Professional business suits and office wear",
          parent_id: undefined
        },
        {
          name: "Accessories",
          description: "Ties, belts, shoes, cufflinks, and other accessories", 
          parent_id: undefined
        },
        {
          name: "Wedding Collection",
          description: "Special occasion wear for weddings and ceremonies",
          parent_id: undefined
        }
      ];

      // Create root categories first
      const createdCategories: { [key: string]: string } = {};
      
      for (const category of defaultCategories) {
        try {
          const newCategory = await apiClient.createCategory(category);
          createdCategories[category.name] = newCategory.id;
        } catch (err) {
          console.warn(`Failed to create category ${category.name}:`, err);
          // Continue with other categories even if one fails
        }
      }

      // Create subcategories based on suit rental business needs
      const subcategories = [
        // Formal Wear subcategories
        {
          name: "Men's Tuxedos",
          description: "Classic and modern tuxedos for formal events",
          parent_name: "Formal Wear"
        },
        {
          name: "Women's Evening Gowns", 
          description: "Elegant evening wear for special occasions",
          parent_name: "Formal Wear"
        },
        {
          name: "Cocktail Dresses",
          description: "Semi-formal dresses for cocktail parties",
          parent_name: "Formal Wear"
        },
        
        // Business Attire subcategories
        {
          name: "Men's Business Suits",
          description: "Professional suits for business meetings",
          parent_name: "Business Attire"
        },
        {
          name: "Women's Business Suits",
          description: "Professional suits and blazers for women",
          parent_name: "Business Attire"
        },
        {
          name: "Dress Shirts",
          description: "Formal and business dress shirts",
          parent_name: "Business Attire"
        },
        
        // Accessories subcategories
        {
          name: "Ties & Bow Ties",
          description: "Neckties, bow ties, and formal accessories",
          parent_name: "Accessories"
        },
        {
          name: "Shoes",
          description: "Dress shoes, heels, and formal footwear",
          parent_name: "Accessories"
        },
        {
          name: "Belts & Suspenders",
          description: "Leather belts and suspenders",
          parent_name: "Accessories"
        },
        
        // Wedding Collection subcategories
        {
          name: "Groom's Attire",
          description: "Complete wedding attire for grooms",
          parent_name: "Wedding Collection"
        },
        {
          name: "Bridesmaid Dresses",
          description: "Bridesmaid and bridal party dresses",
          parent_name: "Wedding Collection"
        },
        {
          name: "Mother of the Bride/Groom",
          description: "Elegant attire for wedding family members",
          parent_name: "Wedding Collection"
        }
      ];

      for (const subcategory of subcategories) {
        if (createdCategories[subcategory.parent_name]) {
          try {
            await apiClient.createCategory({
              name: subcategory.name,
              description: subcategory.description,
              parent_id: createdCategories[subcategory.parent_name]
            });
          } catch (err) {
            console.warn(`Failed to create subcategory ${subcategory.name}:`, err);
          }
        }
      }

      success(
        'Categories Created Successfully!',
        'Business-relevant categories have been created for your suit rental system.'
      );
      
      // Reload categories to show the new ones
      await loadCategories();
      
    } catch (err) {
      console.error('Failed to create categories:', err);
      error(
        'Failed to Create Categories',
        'There was an error creating the business categories. Please try again.'
      );
    } finally {
      setSeeding(false);
    }
  };

  const filterCategories = useCallback((categories: Category[], searchTerm: string): Category[] => {
    if (!Array.isArray(categories)) return [];
    if (!searchTerm) return categories;
    
    return categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasMatchingSubcategories = category.subcategories && 
                                      filterCategories(category.subcategories, searchTerm).length > 0;
      
      if (matchesSearch) {
        return true;
      }
      
      if (hasMatchingSubcategories) {
        return true;
      }
      
      return false;
    }).map(category => ({
      ...category,
      subcategories: category.subcategories ? filterCategories(category.subcategories, searchTerm) : []
    }));
  }, []);

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const paddingLeft = level * 20;

    return (
      <div key={category.id}>
        <Card className="mb-2">
          <CardContent className="py-4">
            <div className="flex items-center justify-between" style={{ paddingLeft }}>
              <div className="flex items-center flex-1">
                {hasSubcategories && (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="mr-2 p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Folder className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                )}
                {!hasSubcategories && (
                  <div className="mr-2 p-1">
                    <div className="h-4 w-4"></div>
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      category.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {hasSubcategories && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {category.subcategories!.length} subcategories
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {formatDate(category.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openEditModal(category)}
                  title="Edit category"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openDeleteModal(category)}
                  title="Delete category"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {hasSubcategories && isExpanded && (
          <div className="ml-4">
            {category.subcategories!.map(subcategory => 
              renderCategory(subcategory, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Use deferred value for search to improve performance
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const filteredCategories = useMemo(() => 
    filterCategories(categories, deferredSearchTerm), 
    [categories, deferredSearchTerm, filterCategories]
  );

  const countCategories = useCallback((categories: Category[]): number => {
    if (!Array.isArray(categories)) return 0;
    return categories.reduce((count, category) => {
      return count + 1 + (category.subcategories ? countCategories(category.subcategories) : 0);
    }, 0);
  }, []);

  const countActiveCategories = useCallback((categories: Category[]): number => {
    if (!Array.isArray(categories)) return 0;
    return categories.reduce((count, category) => {
      const isActive = category.is_active ? 1 : 0;
      const subcategoryCount = category.subcategories ? countActiveCategories(category.subcategories) : 0;
      return count + isActive + subcategoryCount;
    }, 0);
  }, []);

  // Helper function to flatten category tree for dropdown selection
  const flattenCategories = useCallback((categories: Category[], level: number = 0): Category[] => {
    const result: Category[] = [];
    categories.forEach(category => {
      result.push({
        ...category,
        name: '  '.repeat(level) + category.name // Add indentation for visual hierarchy
      });
      if (category.subcategories && category.subcategories.length > 0) {
        result.push(...flattenCategories(category.subcategories, level + 1));
      }
    });
    return result;
  }, []);

  const totalCategories = useMemo(() => countCategories(categories), [categories, countCategories]);
  const activeCategories = useMemo(() => countActiveCategories(categories), [categories, countActiveCategories]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize your inventory with categories and subcategories
            </p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardContent>
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : totalCategories}
                </div>
                <div className="text-sm text-gray-500">Total Categories</div>
                <div className="text-lg font-semibold text-green-600 mt-1">
                  {loading ? '...' : activeCategories}
                </div>
                <div className="text-xs text-gray-500">Active</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Categories List */}
        <div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="animate-pulse flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? 'Try adjusting your search term'
                    : 'Get started by creating your first category or setting up business categories'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={openAddModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={seedDefaultCategories}
                    disabled={seeding}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {seeding ? 'Creating...' : 'Create Business Categories'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              {filteredCategories.map(category => renderCategory(category))}
            </div>
          )}
        </div>


        {/* Add Category Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Add New Category</h2>
                <button
                  onClick={closeAddModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="e.g., Electronics, Clothing, Books"
                    error={errors.name}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this category..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  >
                    <option value="">Root Category (No Parent)</option>
                    {flattenCategories(categories).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to create a root category, or select a parent to create a subcategory
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeAddModal}
                    disabled={createLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoading || !formData.name.trim()}
                    className="flex-1"
                  >
                    {createLoading ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {showEditModal && editingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Edit Category</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="e.g., Electronics, Clothing, Books"
                    error={errors.name}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this category..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  >
                    <option value="">Root Category (No Parent)</option>
                    {flattenCategories(categories)
                      .filter(cat => cat.id !== editingCategory.id) // Don't allow self as parent
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to make this a root category, or select a parent to make it a subcategory
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeEditModal}
                    disabled={editLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editLoading || !formData.name.trim()}
                    className="flex-1"
                  >
                    {editLoading ? 'Updating...' : 'Update Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Category Modal */}
        {showDeleteModal && deletingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Delete Category</h2>
                <button
                  onClick={closeDeleteModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Are you sure you want to delete &quot;{deletingCategory.name}&quot;?
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      This action cannot be undone. Any subcategories will also be affected.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeDeleteModal}
                    disabled={deleteLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeleteCategory}
                    disabled={deleteLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Category'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}